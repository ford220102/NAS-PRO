#include <QWidget>
#include <QPushButton>
#include <QHBoxLayout>

class TaskBar : public QWidget {
public:
    TaskBar() {
        setFixedHeight(40);

        QHBoxLayout *layout = new QHBoxLayout(this);

        QPushButton *start = new QPushButton("START");
        QPushButton *files = new QPushButton("FILES");
        QPushButton *settings = new QPushButton("SETTINGS");

        layout->addWidget(start);
        layout->addWidget(files);
        layout->addWidget(settings);
    }
};
