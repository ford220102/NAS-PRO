#include <QWidget>
#include <QPushButton>
#include <QHBoxLayout>
#include <QApplication>

class TaskBar : public QWidget {
public:
    TaskBar() {
        setFixedHeight(40);

        QHBoxLayout *layout = new QHBoxLayout(this);

        QPushButton *start = new QPushButton("START");
        QPushButton *apps = new QPushButton("APPS");
        QPushButton *files = new QPushButton("FILES");
        QPushButton *shutdown = new QPushButton("POWER");

        layout->addWidget(start);
        layout->addWidget(apps);
        layout->addWidget(files);
        layout->addWidget(shutdown);

        connect(shutdown, &QPushButton::clicked, qApp, &QApplication::quit);
    }
};
