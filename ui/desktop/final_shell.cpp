#include <QApplication>
#include <QWidget>
#include <QVBoxLayout>
#include <QPushButton>
#include "window.cpp"
#include "start_menu.cpp"

class Desktop : public QWidget {
public:
    Desktop() {
        setWindowTitle("NAS-PRO DESKTOP ENVIRONMENT");

        QVBoxLayout *layout = new QVBoxLayout(this);

        QPushButton *openWindow = new QPushButton("Open Window");
        QPushButton *start = new QPushButton("Start Menu");

        layout->addWidget(openWindow);
        layout->addWidget(start);

        connect(openWindow, &QPushButton::clicked, [](){
            Window *w = new Window();
            w->show();
        });

        connect(start, &QPushButton::clicked, [](){
            StartMenu *m = new StartMenu();
            m->show();
        });
    }
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Desktop d;
    d.resize(900, 600);
    d.show();

    return app.exec();
}
